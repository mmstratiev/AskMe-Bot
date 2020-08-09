const SubCommand = require('../classes/subcommand');
const utilites = require('../../utilities');

class AskMe_Add extends SubCommand {
	execute_internal(message, args) {
		let db = utilites.openDatabase();
		db.prepare(
			'UPDATE questions SET answer = ? WHERE server_id = ? AND question = ?'
		).run([args.slice(1).join(' '), message.guild.id, args[0]]);
	}
}

module.exports = new AskMe_Add('edit', 'Desc', [2], 'Usage');
