const fs = require('fs');
const SimpleCommand = require('./simple_command');

module.exports = class Command extends SimpleCommand {
	constructor(name, description, args, usage) {
		super(name, description, args, usage);
	}

	// Avoid overriding, override execute_internal instead
	execute(message, args) {
		if (
			this.args.includes(args.length) ||
			args.length > Math.max.apply(Math, this.args)
		) {
			let subCommands = this.getSubCommands();
			let subCommand = subCommands.get(args[0]);

			if (subCommand) {
				let subCommandArgs = args.slice(1);
				subCommand.execute(message, subCommandArgs);
			} else {
				this.execute_internal(message, args);
			}
		}
	}

	execute_internal(message, args) {}

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
