const SubCommand = require('../classes/subcommand');
const utilites = require('../../utilities');

class AskMe_Add extends SubCommand {
	execute_internal(message, args) {
		let db = utilites.openDatabase();
		let insertQuestion = db.prepare(
			'INSERT INTO questions(server_id, question, answer) VALUES(?,?,?)'
		);

		insertQuestion.run(
			[message.guild.id, args[0], args.slice(1).join(' ')],
			(err) => {
				insertQuestion.finalize();
				db.close();
				if (err) {
					throw err;
				}
			}
		);
	}
}

module.exports = new AskMe_Add('add', 'Desc', [2], 'Usage');
