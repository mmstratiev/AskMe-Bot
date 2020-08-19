const utilities = require('../../utilities');

const SubCommand = require('../classes/subcommand');
class Shop_Add extends SubCommand {
	async execute_internal(message, args) {
		let db = utilities.openDatabase();
		const awaitFilter = (m) => m.author.id === message.author.id;
		const awaitFilterPrice = (m) =>
			m.author.id === message.author.id && Boolean(parseFloat(m.content));

		const awaitConditions = {
			max: 1,
			time: 10000,
			errors: ['time'],
		};

		let addItem = async function () {
			message.channel.send('Enter category name for item');
			let categoryRow = undefined;
			while (!categoryRow) {
				await message.channel
					.awaitMessages(awaitFilter, awaitConditions)
					.then(async (filteredCategoryName) => {
						categoryRow = db
							.prepare(
								'SELECT * FROM categories WHERE server_id = ? AND category_name = ?'
							)
							.get([
								message.guild.id,
								filteredCategoryName.first().content,
							]);
					});
				if (!categoryRow) {
					message.channel.send("Category doesn't exist!");
				}
			}

			message.channel.send('Enter item name');
			await message.channel
				.awaitMessages(awaitFilter, awaitConditions)
				.then(async (filteredName) => {
					message.channel.send('Enter item description');
					await message.channel
						.awaitMessages(awaitFilter, awaitConditions)
						.then(async (filteredDesc) => {
							await message.channel.send('Enter item price');
							await message.channel
								.awaitMessages(
									awaitFilterPrice,
									awaitConditions
								)
								.then(async (filteredPrice) => {
									let itemRow = db
										.prepare(
											'SELECT * FROM items WHERE server_id = ? AND item_name = ?'
										)
										.get([
											message.guild.id,
											filteredName.first().content,
										]);

									if (itemRow) {
										message.reply(
											'That item already exists!'
										);
									} else {
										db.prepare(
											'INSERT INTO items(server_id, category_id, item_name, item_description, item_price) VALUES(?,?,?,?,?)'
										).run([
											message.guild.id,
											categoryRow.id,
											filteredName.first().content,
											filteredDesc.first().content,
											parseFloat(
												filteredPrice.first().content
											),
										]);
										message.reply('Added item');
									}
								});
						});
				});
			// .catch((error) => {
			// 	if (error instanceof Collection) {
			// 		// awaitMessages timed out
			// 		message.reply('Timed out');
			// 	} else {
			// 		throw new Error(error);
			// 	}
			// });
		};

		let addCategory = async function () {
			message.channel.send('Enter category name');
			await message.channel
				.awaitMessages(awaitFilter, awaitConditions)
				.then(async (filteredCategoryName) => {
					message.channel.send('Enter category description');
					await message.channel
						.awaitMessages(awaitFilter, awaitConditions)
						.then(async (filteredCategoryDesc) => {
							let categoryRow = db
								.prepare(
									'SELECT * FROM categories WHERE server_id = ? AND category_name = ?'
								)
								.get([
									message.guild.id,
									filteredCategoryName.first().content,
								]);

							if (categoryRow) {
								message.reply('That category already exists!');
							} else {
								db.prepare(
									'INSERT INTO categories(server_id, category_name, category_description) VALUES(?,?,?)'
								).run([
									message.guild.id,
									filteredCategoryName.first().content,
									filteredCategoryDesc.first().content,
								]);
								message.reply('Added category');
							}
						});
				});
		};

		message.channel.send('1: Item, 2: Category');
		await message.channel
			.awaitMessages(awaitFilter, awaitConditions)
			.then(async (filteredAddType) => {
				if (filteredAddType.first().content === '1') {
					addItem().catch((error) => {
						console.log('Error adding item: ' + error);
					});
				} else {
					addCategory().catch((error) => {
						console.log('Error adding category: ' + error);
					});
				}
			});
	}
}

module.exports = new Shop_Add('add', 'Desc', [0], ['Usage'], ['MANAGE_GUILD']);
