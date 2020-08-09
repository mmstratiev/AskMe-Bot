const SubCommand = require('../classes/subcommand');
const utilites = require('../../utilities');

class AskMe_Add extends SubCommand {
	execute_internal(message, args) {
		let db = utilites.openDatabase();
		let deleteQuestion = db.prepare(
			'DELETE FROM questions WHERE server_id = ? AND question = ?'
		);

		deleteQuestion.run([message.guild.id, args[0]], (err) => {
			deleteQuestion.finalize();
			db.close();
			if (err) {
				throw err;
			}
		});
	}
}

module.exports = new AskMe_Add('remove', 'Desc', [1], 'Usage');
