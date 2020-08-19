const utilities = require('../../utilities');

const SubCommand = require('../classes/subcommand');
class Shop_Edit extends SubCommand {
	async execute_internal(message, args) {}
}

module.exports = new Shop_Edit(
	'edit',
	'Desc',
	[0],
	['Usage'],
	['MANAGE_GUILD']
);
