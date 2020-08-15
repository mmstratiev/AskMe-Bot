const SubCommand = require('../classes/subcommand');
const utilites = require('../../utilities');
const { Collection } = require('discord.js');

class Cart_Checkout extends SubCommand {
	async execute_internal(message, args) {}
}

module.exports = new Cart_Checkout('checkout', 'Desc', [0], ['Usage'], []);
