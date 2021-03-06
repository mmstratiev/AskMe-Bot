const MessageCleaner = require('../classes/message_cleaner');
const { MessageEmbed } = require('discord.js');
const { main_command } = require('../commands.json');

const localization = require('../localization.json');
const utilities = require('../classes/utilities');

const Command = require('../classes/command');
class AskMeCommand extends Command {
	async execute_internal(message, args) {
		let db = utilities.openDatabase();

		let questionRows = db
			.prepare(
				'SELECT question, answer FROM questions WHERE server_id = ?'
			)
			.all(message.guild.id);

		if (questionRows.length > 0) {
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

			let cleaner = new MessageCleaner();

			const sendQuestionsMessage = function () {
				let messageIndex = 1;
				const questionsEmbed = new MessageEmbed()
					.setColor('#000000')
					.setTitle(localization.reply_askme_enter_number)
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
					.then((m) => cleaner.push(m));
			};

			sendQuestionsMessage();
			while (awaitingUserInput) {
				await message.channel
					.awaitMessages(awaitFilter, awaitConditions)
					.then(async (filteredQuestionIndex) => {
						if (filteredQuestionIndex.size > 0) {
							if (
								filteredQuestionIndex.first().content ===
								'finish'
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
									// Print out answer
									const questionRow =
										questionRows[questionIndex];
									const answerEmbed = new MessageEmbed()
										.setTitle(
											`\`${questionIndex + 1}. ${
												questionRow.question
											}\``
										)
										.setDescription(
											`\`\`\`yaml\n${questionRow.answer}\`\`\``
										);
									message.reply(
										localization.reply_askme_user_asked,
										answerEmbed
									);
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
				.reply(localization.reply_askme_finished_asking)
				.then((r) => r.delete({ timeout: 4000 }));

			cleaner.clean({ timeout: 5000 });
		} else {
			message
				.reply(localization.reply_askme_no_questions)
				.then((r) => r.delete({ timeout: 3500 }));
		}
	}
}

module.exports = new AskMeCommand(
	main_command,
	localization.askme_description,
	[0, 1]
);
