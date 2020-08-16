const SubCommand = require('../classes/subcommand');
const utilites = require('../../utilities');

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
