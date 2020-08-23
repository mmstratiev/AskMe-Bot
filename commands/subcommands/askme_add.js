const utilities = require('../../utilities');

const SubCommand = require('../classes/subcommand');
class AskMe_Add extends SubCommand {
	async execute_internal(message, args) {
		let db = utilities.openDatabase();
		let awaitingUserInput = true;

		// Message filter
		const awaitFilter = (m) => m.author.id === message.author.id;

		// Message conditions
		const awaitConditions = {
			idle: 1250,
			max: 100,
		};

		// Message conditions
		const awaitConditionsAnswer = {
			max: 1,
		};

		let messagesToDelete = new Array();

		const sendQuestionMessage = function () {
			message
				.reply(
					'Enter the question you would like to add. Enter `finish` to finish adding questions.'
				)
				.then((m) => messagesToDelete.push(m));
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
								.reply('Enter answer for this question')
								.then((r) => messagesToDelete.push(r));

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
											.reply('Question updated!')
											.then((r) =>
												r.delete({ timeout: 3500 })
											);
									} else {
										message
											.reply('Question added!')
											.then((r) =>
												r.delete({ timeout: 3500 })
											);
									}

									filteredAnswer.forEach((filteredMessage) =>
										messagesToDelete.push(filteredMessage)
									);
								});
						}

						filteredQuestions.forEach((filteredMessage) =>
							messagesToDelete.push(filteredMessage)
						);

						message.channel.bulkDelete(messagesToDelete);
						messagesToDelete = new Array();

						if (awaitingUserInput) {
							sendQuestionMessage();
						}
					}
				});
		}

		message
			.reply('Finished adding questions!')
			.then((r) => r.delete({ timeout: 4000 }));

		db.close();
	}
}

module.exports = new AskMe_Add('add', 'Desc', [0], ['MANAGE_GUILD']);
