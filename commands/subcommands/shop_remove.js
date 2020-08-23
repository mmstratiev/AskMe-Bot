const utilities = require('../../utilities');

const SubCommand = require('../classes/subcommand');
class Shop_Remove extends SubCommand {
	async execute_internal(message, args) {
		let db = utilities.openDatabase();
		const awaitFilter = (m) => m.author.id === message.author.id;
		const awaitConditions = {
			max: 1,
			time: 10000,
			errors: ['time'],
		};

		let removeItem = async function () {
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
		};

		let removeCategory = async function () {
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
		};

		message.channel.send('1: Item, 2: Category');
		await message.channel
			.awaitMessages(awaitFilter, awaitConditions)
			.then(async (filteredAddType) => {
				if (filteredAddType.first().content === '1') {
					removeItem().catch((error) => {
						console.log('Error removing item: ' + error);
					});
				} else {
					removeCategory().catch((error) => {
						console.log('Error removing category: ' + error);
					});
				}
			});
	}
}

module.exports = new Shop_Remove('remove', 'Desc', [0], ['MANAGE_GUILD']);
