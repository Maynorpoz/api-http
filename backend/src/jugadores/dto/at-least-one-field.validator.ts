import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'atLeastOneField', async: false })
class AtLeastOneFieldConstraint implements ValidatorConstraintInterface {
  validate(_valor: unknown, args: ValidationArguments): boolean {
    return AtLeastOneFieldConstraint.camposPresentes(args.object) > 0;
  }

  defaultMessage(): string {
    return 'Debe enviar al menos un campo para actualizar';
  }

  /** Cuenta solo las claves con valor definido: class-transformer puede dejar propiedades en undefined. */
  private static camposPresentes(objeto: object): number {
    return Object.values(objeto).filter((valor) => valor !== undefined).length;
  }
}

/**
 * Decorador de clase que rechaza un cuerpo vacio ({}).
 *
 * Sin esto, un DTO construido con PartialType acepta {} y produce un PATCH que
 * responde 200 sin haber modificado nada.
 */
export function AtLeastOneField(
  validationOptions?: ValidationOptions,
): ClassDecorator {
  return (constructor) => {
    registerDecorator({
      target: constructor,
      // class-validator trata la metadata sin propertyName como validacion de
      // la clase completa, que es justamente lo que se necesita aqui.
      propertyName: undefined as unknown as string,
      options: validationOptions,
      constraints: [],
      validator: AtLeastOneFieldConstraint,
    });
  };
}
