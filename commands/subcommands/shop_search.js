const SubCommand = require('../classes/subcommand');
const utilites = require('../../utilities');
const { Collection } = require('discord.js');

class Shop_Search extends SubCommand {
	async execute_internal(message, args) {
		const db = utilites.openDatabase();

		const awaitFilter = (m) => m.author.id === message.author.id;
		const awaitConditions = {
			max: 1,
			time: 10000,
			errors: ['time'],
		};

		message.channel.send('Enter category');
		await message.channel
			.awaitMessages(awaitFilter, awaitConditions)
			.then(async (filteredCategory) => {
				let categoryRow = db
					.prepare(
						'SELECT Category_id category_id FROM categories WHERE server_id = ? AND category_name = ?'
					)
					.get([message.guild.id, filteredCategory.first().content]);

				if (categoryRow) {
					message.channel.send('Enter keyword');
					await message.channel
						.awaitMessages(awaitFilter, awaitConditions)
						.then(async (filteredKeyword) => {
							let itemRows = db
								.prepare(
									'SELECT * FROM items WHERE server_id = ? AND category_id = ? AND item_name LIKE ?'
								)
								.all([
									message.guild.id,
									categoryRow.category_id,
									`%${filteredKeyword.first().content}%`,
								]);

							if (itemRows.size > 0) {
								message.reply(
									'I found these items matching your search criteria:'
								);
								itemRows.forEach((itemRow) => {
									message.channel.send(itemRow.item_name);
								});
							} else {
								message.reply(
									'No items found that match your search criteria!'
								);
							}
						});
				} else {
					message.reply('Invalid category');
				}
			})
			.catch((error) => {
				if (error instanceof Collection) {
					// awaitMessages timed out
					message.reply('Timed out');
				} else {
					throw new Error(error);
				}
			});
	}
}

module.exports = new Shop_Search('search', 'Desc', [0], ['Usage'], []);
