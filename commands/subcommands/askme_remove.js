const MessageCleaner = require('../../classes/message_cleaner');
const { MessageEmbed } = require('discord.js');

const utilities = require('../../classes/utilities');
const localization = require('../../localization.json');

const SubCommand = require('../../classes/subcommand');
class AskMe_Add extends SubCommand {
	async execute_internal(message, args) {
		let db = utilities.openDatabase();
		let cleaner = new MessageCleaner();

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
			idle: 500,
			max: 100,
		};

		let questionRows = new Array();
		const sendQuestionsMessage = function () {
			questionRows = db
				.prepare(
					'SELECT id, question, answer FROM questions WHERE server_id = ?'
				)
				.all(message.guild.id);

			let messageIndex = 1;
			const questionsEmbed = new MessageEmbed()
				.setColor('#000000')
				.setTitle(localization.reply_askme_remove_enter_question)
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

			message.channel.send(questionsEmbed).then((m) => cleaner.push(m));
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
									.reply(
										localization.reply_askme_remove_removed
									)
									.then((r) => r.delete({ timeout: 3500 }));
							}
						}
						filteredQuestionIndex.forEach((filteredMessage) =>
							cleaner.push(filteredMessage)
						);

						cleaner.clean();

						if (awaitingUserInput) {
							sendQuestionsMessage();
						}
					}
				});
		}

		message
			.reply(localization.reply_askme_remove_finished)
			.then((r) => r.delete({ timeout: 4000 }));

		cleaner.clean({ timeout: 5000 });
	}
}

module.exports = new AskMe_Add(
	'remove',
	localization.askme_remove_description,
	[0],
	['MANAGE_GUILD']
);
