const {
	response_invalid_argument_count,
	response_proper_command,
} = require('../../localization.json');

const { prefix } = require('../../config.json');

module.exports = class SimpleCommand {
	constructor(name, description, args, usage, permissions = []) {
		this.name = name;
		this.description = description;
		this.args = args;
		this.usage = usage;
		this.permissions = permissions;
	}

	execute(message, args) {
		console.log(
			`Command ${message.content} was issued by ${message.author.tag} in ${message.guild.name} #${message.channel.name}.`
		);
	}

	matchArguments(args) {
		console.log(args);
		console.log(this.args);
		return Boolean(
			this.args.includes(args.length) ||
			args.length > Math.max.apply(Math, this.args)
		);
	}

	matchPermissions(permissions) {
		let permissionsAsArray = permissions.toArray();
		return this.permissions.every((permission) => {
			return permissionsAsArray.includes(permission);
		});
	}

	getInvalidArgumentsReply() {
		return `${response_invalid_argument_count}\n${response_proper_command} \`${prefix}${this.name} ${this.usage}\``;
	}

	getInvalidPermissionsReply() {
		return `You don't have permissions to run this command!`;
	}
};
