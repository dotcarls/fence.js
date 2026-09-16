declare module 'validate.js' {
    type Constraints = Record<string, Record<string, unknown>>;
    function validate(
        attributes: unknown,
        constraints: Constraints,
    ): Record<string, string[]> | undefined;
    export default validate;
}
