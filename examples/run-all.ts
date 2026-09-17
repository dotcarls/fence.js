// Runs every example. Used by `npm run examples` and CI.
for (const name of ['basic', 'policy', 'serialize', 'memoize']) {
    console.log(`\n=== ${name} ===`);
    await import(`./${name}.js`);
}
