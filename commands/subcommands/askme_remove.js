const utilities = require('../../utilities');
const { MessageEmbed } = require('discord.js');

const SubCommand = require('../classes/subcommand');
class AskMe_Add extends SubCommand {
	async execute_internal(message, args) {
		let db = utilities.openDatabase();
		let awaitingUserInput = true;

		// Message filter
		const awaitFilter = (m) => {
			let result = false;
			if (m.author.id === message.author.id) {
				if (!isNaN(parseInt(m.content)) || m.content === 'finish') {
					result = true;
				} else {
					m.delete();
				}
			}
			return result;
		};

		// Message conditions
		const awaitConditions = {
			idle: 1250,
			max: 100,
		};

		let questionRows = new Array();
		let messagesToDelete = new Array();

		const sendQuestionsMessage = function () {
			questionRows = db
				.prepare(
					'SELECT id, question, answer FROM questions WHERE server_id = ?'
				)
				.all(message.guild.id);

			let messageIndex = 1;
			const questionsEmbed = new MessageEmbed()
				.setColor('#000000')
				.setTitle(
					'Enter the number of the question you want to delete. Enter `finish` to finish deleting questions.'
				)
				.setDescription(
					questionRows
						.map(
							(questionRow) =>
								`\`\`\`md\n${messageIndex++}. ${
									questionRow.question
								}\`\`\``
						)
						.join(' ')
				);

			message.channel
				.send(questionsEmbed)
				.then((m) => messagesToDelete.push(m));
		};

		sendQuestionsMessage();
		while (awaitingUserInput) {
			await message.channel
				.awaitMessages(awaitFilter, awaitConditions)
				.then(async (filteredQuestionIndex) => {
					if (filteredQuestionIndex.size > 0) {
						if (
							filteredQuestionIndex.first().content === 'finish'
						) {
							awaitingUserInput = false;
						} else {
							let questionIndex = parseInt(
								filteredQuestionIndex.first().content - 1
							);

							if (
								questionIndex >= 0 &&
								questionIndex < questionRows.length
							) {
								const questionRow = questionRows[questionIndex];
								db.prepare(
									'DELETE FROM questions WHERE id = ?'
								).run([questionRow.id]);

								message
									.reply('Question deleted!')
									.then((r) => r.delete({ timeout: 3500 }));
							}
						}
						filteredQuestionIndex.forEach((filteredMessage) =>
							messagesToDelete.push(filteredMessage)
						);

						message.channel.bulkDelete(messagesToDelete);
						messagesToDelete = new Array();

						if (awaitingUserInput) {
							sendQuestionsMessage();
						}
					}
				});
		}

		message
			.reply('Finished deleting questions!')
			.then((r) => r.delete({ timeout: 4000 }));
	}
}

module.exports = new AskMe_Add(
	'remove',
	'Desc',
	[0],
	['Usage'],
	['MANAGE_GUILD']
);
