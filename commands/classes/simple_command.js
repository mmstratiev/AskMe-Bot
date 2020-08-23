const {
	reply_missing_permissions,
	response_invalid_argument_count,
	response_proper_command,
} = require('../../localization.json');

const { prefix } = require('../../config.json');

module.exports = class SimpleCommand {
	constructor(name, description, args = [], permissions = []) {
		this.name = name;
		this.description = description;
		this.args = args;
		this.permissions = permissions;
	}

	async execute(message, args) {
		console.log(
			`Command ${message.content} was issued by ${message.author.tag} in ${message.guild.name} #${message.channel.name}.`
		);
	}

	matchArguments(args) {
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
		let result = `${response_invalid_argument_count}\n${response_proper_command} `;

		this.usage.forEach((useCase) => {
			result += `\`${prefix}${this.name} ${useCase}\`, `;
		});

		result.trimRight();
		result = result.slice(0, result.length - 2);

		return result;
	}

	getInvalidPermissionsReply() {
		return reply_missing_permissions;
	}
};
