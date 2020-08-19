const { empty_command_usage } = require('../localization.json');
const { shop_command } = require('../commands.json');

const Command = require('./classes/command');
class ShopCommand extends Command {
	async execute_internal(message, args) {
		// TODO:
	}
}

module.exports = new ShopCommand(
	shop_command,
	'Open shop',
	[0],
	[empty_command_usage]
);
