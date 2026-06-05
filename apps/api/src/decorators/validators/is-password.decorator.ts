import { registerDecorator, type ValidationOptions } from 'class-validator';

export function IsPassword(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object, propertyName) => {
    registerDecorator({
      propertyName: propertyName as string,
      name: 'isPassword',
      target: object.constructor,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: string) {
          // At least one letter and one digit, only the allowed character set.
          // Length floor is enforced separately by MinLength(8) in PasswordField.
          return (
            typeof value === 'string' &&
            /[A-Za-z]/.test(value) &&
            /\d/.test(value) &&
            /^[\d!#$%&*@A-Z^a-z]+$/.test(value)
          );
        },
        defaultMessage() {
          return `$property must be at least 8 characters and contain a letter and a number`;
        },
      },
    });
  };
}
