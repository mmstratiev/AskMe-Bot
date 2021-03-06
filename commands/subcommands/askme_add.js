const MessageCleaner = require('../../classes/message_cleaner');

const utilities = require('../../classes/utilities');
const localization = require('../../localization.json');

const SubCommand = require('../../classes/subcommand');
class AskMe_Add extends SubCommand {
	async execute_internal(message, args) {
		let db = utilities.openDatabase();
		let cleaner = new MessageCleaner();

		let awaitingUserInput = true;

		// Message filter
		const awaitFilter = (m) => m.author.id === message.author.id;

		// Message conditions
		const awaitConditions = {
			idle: 500,
			max: 100,
		};

		// Message conditions
		const awaitConditionsAnswer = {
			max: 1,
		};

		const sendQuestionMessage = function () {
			message
				.reply(localization.reply_askme_add_enter_question)
				.then((m) => cleaner.push(m));
		};

		sendQuestionMessage();
		while (awaitingUserInput) {
			await message.channel
				.awaitMessages(awaitFilter, awaitConditions)
				.then(async (filteredQuestions) => {
					if (filteredQuestions.size > 0) {
						let questionToAdd = filteredQuestions.first().content;
						if (questionToAdd === 'finish') {
							awaitingUserInput = false;
						} else {
							message
								.reply(
									localization.reply_askme_add_enter_asnwer
								)
								.then((r) => cleaner.push(r));

							await message.channel
								.awaitMessages(
									awaitFilter,
									awaitConditionsAnswer
								)
								.then(async (filteredAnswer) => {
									let questionRow = db
										.prepare(
											'SELECT * FROM questions WHERE server_id = ? AND question = ?'
										)
										.get([message.guild.id, questionToAdd]);

									db.prepare(
										`INSERT INTO questions(server_id, question, answer) VALUES(?,?,?)
										ON CONFLICT(server_id, question) DO UPDATE SET answer=?`
									).run([
										message.guild.id,
										questionToAdd,
										filteredAnswer.first().content,
										filteredAnswer.first().content,
									]);

									if (questionRow) {
										message
											.reply(
												localization.reply_askme_add_added
											)
											.then((r) =>
												r.delete({ timeout: 3500 })
											);
									} else {
										message
											.reply(
												localization.reply_askme_add_updated
											)
											.then((r) =>
												r.delete({ timeout: 3500 })
											);
									}

									filteredAnswer.forEach((filteredMessage) =>
										cleaner.push(filteredMessage)
									);
								});
						}

						filteredQuestions.forEach((filteredMessage) =>
							cleaner.push(filteredMessage)
						);

						cleaner.clean();

						if (awaitingUserInput) {
							sendQuestionMessage();
						}
					}
				});
		}

		message
			.reply(localization.reply_askme_add_finished)
			.then((r) => r.delete({ timeout: 4000 }));

		cleaner.clean({ timeout: 5000 });
		db.close();
	}
}

module.exports = new AskMe_Add(
	'add',
	localization.askme_add_description,
	[0],
	['MANAGE_GUILD']
);
