const MessageCleaner = require('../classes/message_cleaner');
const { MessageEmbed } = require('discord.js');

const utilities = require('../../utilities');
const localization = require('../../localization.json');

const SubCommand = require('../classes/subcommand');
class Shop_Add extends SubCommand {
	async add_item(message) {
		let db = utilities.openDatabase();
		let cleaner = new MessageCleaner();

		let awaitingUserInput = true;
		const awaitFilter = (m) => m.author.id === message.author.id;
		const awaitFilterPrice = (m) => {
			let result = false;
			if (m.author.id === message.author.id) {
				if (!isNaN(parseFloat(m.content)) || m.content === 'finish') {
					result = true;
				} else {
					m.delete();
				}
			}
			return result;
		};
		const awaitConditions = {
			max: 1,
		};

		while (awaitingUserInput) {
			let newItemCategoryId = undefined;
			let newItemName = '';
			let newItemDescription = '';
			let newItemPrice = '';

			// Get all categories in server
			const availableCategoriesRows = db
				.prepare(
					'SELECT * FROM categories WHERE server_id = ? ORDER BY category_name'
				)
				.all([message.guild.id]);

			const buildCategoriesEmbed = function () {
				const result = new MessageEmbed()
					.setColor('#7289da')
					.setTitle(localization.reply_shop_add_enter_item_category)
					.addFields(
						availableCategoriesRows.map(
							(availableCategoriesRow) => {
								return {
									name: `\`${availableCategoriesRow.category_name}\``,
									value: `\`\`\`${availableCategoriesRow.category_description}\`\`\``,
									inline: true,
								};
							}
						)
					);
				return result;
			};

			// Choose Category
			message.reply(buildCategoriesEmbed()).then((r) => {
				cleaner.push(r);
			});

			while (!newItemCategoryId && awaitingUserInput) {
				await message.channel
					.awaitMessages(awaitFilter, awaitConditions)
					.then(async (filteredCategoryName) => {
						const categoryName = filteredCategoryName.first()
							.content;

						if (categoryName === 'finish') {
							awaitingUserInput = false;
						} else {
							const categoryRow = availableCategoriesRows.find(
								(availableCategoryRow) =>
									availableCategoryRow.category_name ===
									categoryName
							);

							if (categoryRow) {
								newItemCategoryId = categoryRow.id;
							} else {
								message
									.reply('Invalid category!')
									.then((r) => r.delete({ timeout: 3500 }));
							}
						}

						filteredCategoryName.forEach((filteredMessage) =>
							cleaner.push(filteredMessage)
						);
					});
			}

			if (awaitingUserInput) {
				// Item name
				message.channel
					.send(localization.reply_shop_add_enter_item_name)
					.then((r) => cleaner.push(r));

				await message.channel
					.awaitMessages(awaitFilter, awaitConditions)
					.then(async (filteredName) => {
						if (filteredName.first().content === 'finish') {
							awaitingUserInput = false;
						} else {
							newItemName = filteredName.first().content;
						}

						filteredName.forEach((filteredMessage) =>
							cleaner.push(filteredMessage)
						);
					});
			}

			if (awaitingUserInput) {
				// Item description
				message.channel
					.send(localization.reply_shop_add_enter_item_description)
					.then((r) => cleaner.push(r));

				await message.channel
					.awaitMessages(awaitFilter, awaitConditions)
					.then(async (filteredDescription) => {
						if (filteredDescription.first().content === 'finish') {
							awaitingUserInput = false;
						} else {
							newItemDescription = filteredDescription.first()
								.content;
						}

						filteredDescription.forEach((filteredMessage) =>
							cleaner.push(filteredMessage)
						);
					});
			}

			if (awaitingUserInput) {
				// Item price
				message.channel
					.send(localization.reply_shop_add_enter_item_price)
					.then((r) => cleaner.push(r));

				await message.channel
					.awaitMessages(awaitFilterPrice, awaitConditions)
					.then(async (filteredPrice) => {
						if (filteredPrice.first().content === 'finish') {
							awaitingUserInput = false;
						} else {
							newItemPrice = parseFloat(
								filteredPrice.first().content
							);
						}

						filteredPrice.forEach((filteredMessage) =>
							cleaner.push(filteredMessage)
						);
					});
			}

			if (awaitingUserInput) {
				let itemRow = db
					.prepare(
						'SELECT * FROM items WHERE server_id = ? AND item_name = ?'
					)
					.get([message.guild.id, newItemName]);

				db.prepare(
					`INSERT INTO items(server_id, category_id, item_name, item_description, item_price) VALUES(?,?,?,?,?)
					ON CONFLICT(server_id, item_name) DO UPDATE SET category_id=?, item_description=?, item_price=?`
				).run([
					message.guild.id,
					newItemCategoryId,
					newItemName,
					newItemDescription,
					newItemPrice,
					newItemCategoryId,
					newItemDescription,
					newItemPrice,
				]);

				if (itemRow) {
					message
						.reply(localization.reply_shop_add_item_updated)
						.then((r) => r.delete({ timeout: 3500 }));
				} else {
					message
						.reply(localization.reply_shop_add_item_added)
						.then((r) => r.delete({ timeout: 3500 }));
				}
			}

			cleaner.clean();
		}

		message.reply(localization.reply_shop_add_item_finished).then((r) => {
			r.delete({ timeout: 4000 });
		});

		cleaner.clean({ timeout: 5000 });
		db.close();
	}

	async add_category(message) {
		let db = utilities.openDatabase();
		let awaitingUserInput = true;
		let cleaner = new MessageCleaner();

		const awaitFilter = (m) => m.author.id === message.author.id;
		const awaitFilterPrice = (m) => {
			let result = false;
			if (m.author.id === message.author.id) {
				if (!isNaN(parseFloat(m.content)) || m.content === 'finish') {
					result = true;
				} else {
					m.delete();
				}
			}
			return result;
		};
		const awaitConditions = {
			max: 1,
		};

		while (awaitingUserInput) {
			let newCategoryName = '';
			let newCategoryDescription = '';

			message
				.reply(localization.reply_shop_add_enter_category_name)
				.then((r) => cleaner.push(r));

			await message.channel
				.awaitMessages(awaitFilter, awaitConditions)
				.then(async (filteredCategoryName) => {
					if (filteredCategoryName.first().content === 'finish') {
						awaitingUserInput = false;
					} else {
						newCategoryName = filteredCategoryName.first().content;
					}

					filteredCategoryName.forEach((filteredMessage) =>
						cleaner.push(filteredMessage)
					);
				});

			if (awaitingUserInput) {
				message
					.reply(
						localization.reply_shop_add_enter_category_description
					)
					.then((r) => cleaner.push(r));
				await message.channel
					.awaitMessages(awaitFilter, awaitConditions)
					.then(async (filteredCategoryDesc) => {
						if (filteredCategoryDesc.first().content === 'finish') {
							awaitingUserInput = false;
						} else {
							newCategoryDescription = filteredCategoryDesc.first()
								.content;
						}

						filteredCategoryDesc.forEach((filteredMessage) =>
							cleaner.push(filteredMessage)
						);
					});
			}

			if (awaitingUserInput) {
				let categoryRow = db
					.prepare(
						'SELECT * FROM categories WHERE server_id = ? AND category_name = ?'
					)
					.get([message.guild.id, newCategoryName]);

				db.prepare(
					`INSERT INTO categories(server_id, category_name, category_description) VALUES(?,?,?)
					ON CONFLICT(server_id, category_name) DO UPDATE SET category_description=?`
				).run([
					message.guild.id,
					newCategoryName,
					newCategoryDescription,
					newCategoryDescription,
				]);

				if (categoryRow) {
					message
						.reply(localization.reply_shop_add_category_updated)
						.then((r) => r.delete({ timeout: 3500 }));
				} else {
					message
						.reply(localization.reply_shop_add_category_added)
						.then((r) => r.delete({ timeout: 3500 }));
				}
			}

			cleaner.clean();
		}

		message
			.reply(localization.reply_shop_add_category_finished)
			.then((r) => {
				r.delete({ timeout: 4000 });
			});

		cleaner.clean({ timeout: 5000 });
		db.close();
	}

	async execute_internal(message, args) {
		let awaitingUserInput = true;
		const awaitFilter = (m) => m.author.id === message.author.id;
		const awaitConditions = {
			max: 100,
			idle: 500,
		};

		let cleaner = new MessageCleaner();

		const sendMessage = () => {
			const embed = new MessageEmbed()
				.setColor('#000000')
				.setTitle(localization.reply_shop_add_message)
				.setDescription(
					`\`\`\`md\n1. ${localization.reply_shop_add_item}\n2. ${localization.reply_shop_add_category}\`\`\``
				);

			message.reply(embed).then((r) => {
				cleaner.push(r);
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
							await this.add_item(message);
						} else if (optionIndex === '2') {
							await this.add_category(message);
						}

						filteredAddType.forEach((filteredMessage) => {
							cleaner.push(filteredMessage);
						});

						cleaner.clean();

						if (awaitingUserInput) {
							sendMessage();
						}
					}
				});
		}

		message.reply(localization.reply_shop_add_finished).then((r) => {
			r.delete({ timeout: 4000 });
		});

		cleaner.clean({ timeout: 5000 });
	}
}

module.exports = new Shop_Add(
	'add',
	localization.shop_add_description,
	[0],
	['MANAGE_GUILD']
);
