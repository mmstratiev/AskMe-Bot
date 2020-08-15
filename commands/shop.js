const { empty_command_usage } = require('../localization.json');
const { shop_command } = require('../commands.json');

const utilities = require('../utilities');

const createOrder = require('../paypal/orders/createOrder');

const Command = require('./classes/command');
class ShopCommand extends Command {
	async execute_internal(message, args) {
		const db = utilities.openDatabase();
		const awaitFilter = (m) => m.author.id === message.author.id;
		const awaitConditions = {
			max: 1,
			time: 10000,
			errors: ['time'],
		};

		let rows = db
			.prepare('SELECT * FROM items WHERE server_id = ?')
			.all(message.guild.id);

		if (rows.length > 0) {
			let messageReply =
				'What would you like to buy? You can buy any of the following items: \n';

			rows.forEach((row) => {
				messageReply += `\`${row.item_name}\`\n`;
			});
		} else {
			message.reply('Sorry, the shop is empty!');
		}

		// let db = utilities.openDatabase();
		// let messageReply = '';

		// await message.reply('Creating order link...').then(async (r) => {
		// 	try {
		// 		await createOrder.createOrder().then((createResponse) => {
		// 			createResponse.result.links.forEach((element) => {
		// 				if (element.rel === 'approve') {
		// 					message.reply(element.href);
		// 				}
		// 			});
		// 		});
		// 	} catch (error) {
		// 		throw new Error(error);
		// 	} finally {
		// 		r.delete();
		// 	}
		// });

		// const awaitFilter = (m) => m.author.id === message.author.id;
		// await message.channel
		// 	.awaitMessages(awaitFilter, { max: 1, time: 10000 })
		// 	.then(async (filteredMessages) => {
		// 		message.channel.send(filteredMessages.first().content);
		// 	});

		// if (args.length == 0) {
		// }
	}
}

module.exports = new ShopCommand(
	shop_command,
	'Open shop',
	[0],
	[empty_command_usage]
);
