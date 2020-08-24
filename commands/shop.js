const localization = require('../localization.json');
const { shop_command } = require('../commands.json');

const Command = require('./classes/command');
class ShopCommand extends Command {
	async execute_internal(message, args) {
		// TODO:
	}
}

module.exports = new ShopCommand(shop_command, localization.shop_description, [
	0,
]);
