const SubCommand = require('../classes/subcommand');
const utilites = require('../../utilities');

class AskMe_Add extends SubCommand {
	execute_internal(message, args) {
		let db = utilites.openDatabase();
		let updateQuestion = db.prepare(
			'UPDATE questions SET answer = ? WHERE server_id = ? AND question = ?'
		);

		updateQuestion.run(
			[args.slice(1).join(' '), message.guild.id, args[0]],
			(err) => {
				updateQuestion.finalize();
				db.close();
				if (err) {
					throw err;
				}
			}
		);
	}
}

module.exports = new AskMe_Add('edit', 'Desc', [2], 'Usage');
