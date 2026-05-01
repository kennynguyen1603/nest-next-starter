import { Transform } from 'class-transformer';

export class EntityDocumentHelper {
  @Transform(
    (value) => {
      if ('value' in value) {
        // https://github.com/typestack/class-transformer/issues/879
        return String((value.obj as Record<string, unknown>)[value.key]);
      }

      return 'unknown value';
    },
    {
      toPlainOnly: true,
    },
  )
  _id!: string;
}
