const utilities = require('../../utilities');

const SubCommand = require('../classes/subcommand');
class AskMe_Add extends SubCommand {
	execute_internal(message, args) {
		let db = utilities.openDatabase();
		db.prepare(
			'DELETE FROM questions WHERE server_id = ? AND question = ?'
		).run([message.guild.id, args[0]]);
	}
}

module.exports = new AskMe_Add(
	'remove',
	'Desc',
	[1],
	['Usage'],
	['MANAGE_GUILD']
);
