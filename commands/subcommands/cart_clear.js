const SubCommand = require('../classes/subcommand');
const utilites = require('../../utilities');
const { Collection } = require('discord.js');

class Cart_Clear extends SubCommand {
	async execute_internal(message, args) {}
}

module.exports = new Cart_Clear('clear', 'Desc', [0], ['Usage'], []);
