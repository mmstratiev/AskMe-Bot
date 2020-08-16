const SubCommand = require('../classes/subcommand');
const utilities = require('../../utilities');
const createOrder = require('../../paypal/orders/createOrder');
const { Collection } = require('discord.js');

class Cart_Checkout extends SubCommand {
	async execute_internal(message, args) {
		let db = utilities.openDatabase();
		let messageReply = '';

		await message.reply('Creating order link...').then(async (r) => {
			try {
				await createOrder.createOrder().then((createResponse) => {
					createResponse.result.links.forEach((element) => {
						if (element.rel === 'approve') {
							message.reply(element.href);
						}
					});
				});
			} catch (error) {
				throw new Error(error);
			} finally {
				r.delete();
			}
		});
	}
}

module.exports = new Cart_Checkout('checkout', 'Desc', [0], ['Usage'], []);
