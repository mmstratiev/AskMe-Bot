const utilities = require('../../utilities');
const localization = require('../../localization.json');

const SubCommand = require('../classes/subcommand');
class Shop_Remove extends SubCommand {
	async remove_item(message) {
		message.channel.send('Enter item name to remove');
		await message.channel
			.awaitMessages(awaitFilter, awaitConditions)
			.then(async (filteredName) => {
				let itemRow = db
					.prepare(
						'SELECT ID id FROM items WHERE server_id = ? AND item_name = ?'
					)
					.get([message.guild.id, filteredName.first().content]);

				if (itemRow) {
					db.prepare('DELETE FROM items WHERE id = ?').run([
						itemRow.id,
					]);
				} else {
					message.reply("That item doesn't exist!");
				}
			});
	}

	async remove_category(message) {
		message.channel.send('Enter category name to remove');
		await message.channel
			.awaitMessages(awaitFilter, awaitConditions)
			.then(async (filteredName) => {
				let categoryRow = db
					.prepare(
						'SELECT ID id FROM categories WHERE server_id = ? AND category_name = ?'
					)
					.get([message.guild.id, filteredName.first().content]);

				if (categoryRow) {
					db.prepare('DELETE FROM categories WHERE id = ?').run([
						categoryRow.id,
					]);

					message.reply('Deleted category');
				} else {
					message.reply("That category doesn't exist!");
				}
			});
	}

	async execute_internal(message, args) {
		let db = utilities.openDatabase();
		let awaitingUserInput = true;

		const awaitFilter = (m) => m.author.id === message.author.id;
		const awaitConditions = {
			max: 1,
			time: 10000,
			errors: ['time'],
		};

		const sendMessage = () => {
			message
				.reply(
					`${localization.reply_shop_remove_message}\n1: ${localization.reply_shop_add_item}\n2: ${localization.reply_shop_add_category}`
				)
				.then((r) => {
					messagesToDelete.push(r);
				});
		};

		// Choose what to add
		sendMessage();
		while (awaitingUserInput) {
			await message.channel
				.awaitMessages(awaitFilter, awaitConditions)
				.then(async (filteredAddType) => {
					if (filteredAddType.size > 0) {
						const optionIndex = filteredAddType.first().content;
						if (optionIndex === 'finish') {
							awaitingUserInput = false;
						} else if (optionIndex === '1') {
							await this.remove_item(message);
						} else if (optionIndex === '2') {
							await this.remove_category(message);
						}

						filteredAddType.forEach((filteredMessage) => {
							messagesToDelete.push(filteredMessage);
						});

						message.channel.bulkDelete(messagesToDelete);
						messagesToDelete = new Array();

						if (awaitingUserInput) {
							sendMessage();
						}
					}
				});
		}

		message.reply(localization.reply_shop_remove_finished).then((r) => {
			r.delete({ timeout: 4000 });
		});
	}
}

module.exports = new Shop_Remove('remove', 'Desc', [0], ['MANAGE_GUILD']);
