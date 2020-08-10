const SubCommand = require('../classes/subcommand');
const utilites = require('../../utilities');

class AskMe_Add extends SubCommand {
	execute_internal(message, args) {
		let db = utilites.openDatabase();
		let questionRow = db
			.prepare(
				'SELECT * FROM questions WHERE server_ID = ? AND question = ?'
			)
			.get([message.guild.id, args[0]]);

		if (questionRow) {
			message.reply('That question already exists!');
		} else {
			db.prepare(
				'INSERT INTO questions(server_id, question, answer) VALUES(?,?,?)'
			).run([message.guild.id, args[0], args.slice(1).join(' ')]);
		}
	}
}

module.exports = new AskMe_Add('add', 'Desc', [2], ['Usage'], ['MANAGE_GUILD']);
