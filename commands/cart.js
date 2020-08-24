const localization = require('../localization.json');
const { cart_command } = require('../commands.json');

const utilities = require('../utilities');

const createOrder = require('../paypal/orders/createOrder');

const Command = require('./classes/command');
class CartCommand extends Command {
	async execute_internal(message, args) {
		// TODO:
	}
}

module.exports = new CartCommand(cart_command, localization.cart_description, [
	0,
	1,
]);
