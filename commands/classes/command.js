const fs = require('fs');
const SimpleCommand = require('./simple_command');

module.exports = class Command extends SimpleCommand {
	constructor(name, description, args = [], usage = [], permissions = []) {
		super(name, description, args, usage, permissions);
	}

	// Avoid overriding, override execute_internal instead
	async execute(message, args) {
		await SimpleCommand.prototype.execute(message, args);
		if (this.matchPermissions(message.member.permissions)) {
			if (this.matchArguments(args)) {
				let subCommands = this.getSubCommands();
				let subCommand = subCommands.get(args[0]);

				// try {
					if (subCommand) {
						let subCommandArgs = args.slice(1);
						await subCommand.execute(message, subCommandArgs);
					} else {
						await this.execute_internal(message, args);
					}
				// } catch (error) {
				// 	throw new Error(error);
				// }
			} else {
				message.reply(this.getInvalidArgumentsReply());
			}
		} else {
			message.reply(this.getInvalidPermissionsReply());
		}
	}

	async execute_internal(message, args) {}

	// TODO: Instead of using file names to find sub commands for given parent, create and use property 'parent_name' for sub commands
	getSubCommands() {
		let subCommands = new Map();
		let subCommandRegex = new RegExp(`^${this.name}_.+.js$`);

		// get all .js files in "subcommands" folder
		const commandFiles = fs
			.readdirSync('./commands/subcommands')
			.filter((file) => file.match(subCommandRegex));

		for (const file of commandFiles) {
			const subCommand = require(`../subcommands/${file}`);

			// set a new item in the Collection
			// with the key as the SubCommand name and the value as the exported module
			subCommands.set(subCommand.name, subCommand);
		}

		return subCommands;
	}
};
