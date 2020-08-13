const { empty_command_usage } = require('../localization.json');
const { shop_command } = require('../commands.json');

const utilities = require('../utilities');

const createOrder = require('../paypal/orders/createOrder');

const Command = require('./classes/command');
class ShopCommand extends Command {
	execute_internal(message, args) {
		let db = utilities.openDatabase();
		let messageReply = '';

		createOrder.createOrder().then((response) => {
			response.result.links.forEach((element) => {
				if (element.rel === 'approve') {
					message.reply(element.href);
				}
			});
		});
		if (args.length == 0) {
		}
	}
}

module.exports = new ShopCommand(
	shop_command,
	'Open shop',
	[0],
	[empty_command_usage]
);
