// Memoize pure validators per built fence. Every outcome is cached, including `false`.
import { FenceBuilder } from 'fence.js';

let lookups = 0;
const knownDomain = (email: string, domains: readonly string[]): boolean => {
    lookups++;
    return domains.some((domain) => email.endsWith(`@${domain}`));
};

const fence = FenceBuilder.create()
    .register('knownDomain', knownDomain, {
        memoize: { key: (subject) => String(subject).toLowerCase() },
    })
    .knownDomain(['example.com', 'example.org'])
    .build();

for (const email of ['tim@example.com', 'TIM@EXAMPLE.COM', 'eve@evil.test', 'eve@evil.test']) {
    console.log(email, fence.run(email).passed);
}
console.log('validator calls:', lookups); // 2
