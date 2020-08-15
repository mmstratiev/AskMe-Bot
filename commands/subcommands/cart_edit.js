const SubCommand = require('../classes/subcommand');
const utilites = require('../../utilities');
const { Collection } = require('discord.js');

class Cart_Edit extends SubCommand {
	async execute_internal(message, args) {}
}

module.exports = new Cart_Edit('edit', 'Desc', [0], ['Usage'], []);
