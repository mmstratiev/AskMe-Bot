const SubCommand = require('../classes/subcommand');
const utilites = require('../../utilities');
const { Collection } = require('discord.js');

class Cart_Clear extends SubCommand {
	async execute_internal(message, args) {
		const db = utilites.openDatabase();

		let cartRow = db
			.prepare(
				'SELECT ID id FROM carts WHERE server_id = ? AND user_id = ?'
			)
			.get([message.guild.id, message.author.id]);

		if (cartRow) {
			db.prepare('DELETE FROM cart_items WHERE cart_id = ?').run([
				cartRow.id,
			]);
			message.reply('Cart cleared!');
		} else {
			throw new Error(
				"Cart doesn't exist! Should be added on start of the bot!"
			);
		}
	}
}

module.exports = new Cart_Clear('clear', 'Desc', [0], ['Usage'], []);
