const { empty_command_usage } = require('../localization.json');
const { cart_command } = require('../commands.json');

const utilities = require('../utilities');

const createOrder = require('../paypal/orders/createOrder');

const Command = require('./classes/command');
class CartCommand extends Command {
	async execute_internal(message, args) {
		// TODO:
	}
}

module.exports = new CartCommand(cart_command, 'Cart', [0, 1]);
