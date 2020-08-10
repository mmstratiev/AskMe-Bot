const {
	empty_command_usage,
	main_command_usage,
	response_unknown_question,
} = require('../localization.json');

const { main_command } = require('../commands.json');
const utilities = require('../utilities');

const Command = require('./classes/command');

class AskMeCommand extends Command {
	execute_internal(message, args) {
		let db = utilities.openDatabase();

		let messageReply = '';
		if (args.length == 0) {
			// no arguments, display possible questions
			messageReply = 'Sorry, it seems that I know nothing!';

			let rows = db
				.prepare(
					'SELECT Question question FROM questions WHERE server_id = ?'
				)
				.all(message.guild.id);

			if (rows.length > 0) {
				messageReply =
					'What would you like to know? You can ask me any of the following questions: \n';

				rows.forEach((row) => {
					messageReply += `\`${row.question}\`\n`;
				});
			}
			message.reply(messageReply);
		} else {
			// one argument, try to answer question that matches argument
			messageReply = response_unknown_question;
			let row = db
				.prepare(
					'SELECT Answer answer FROM questions WHERE server_id = ? AND question = ?'
				)
				.get([message.guild.id, args[0]]);

			if (row) {
				messageReply = row.answer;
			}

			message.reply(messageReply);
		}
	}
}

module.exports = new AskMeCommand(
	main_command,
	'Answers the asked questions.',
	[0, 1],
	[empty_command_usage, main_command_usage]
);
