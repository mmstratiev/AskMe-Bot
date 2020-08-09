const SubCommand = require('../classes/subcommand');
const utilites = require('../../utilities');

class AskMe_Add extends SubCommand {
	execute_internal(message, args) {
		let db = utilites.openDatabase();
		db.prepare(
			'DELETE FROM questions WHERE server_id = ? AND question = ?'
		).run([message.guild.id, args[0]]);
	}
}

module.exports = new AskMe_Add('remove', 'Desc', [1], 'Usage', ['MANAGE_GUILD']);
