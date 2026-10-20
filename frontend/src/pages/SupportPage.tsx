import { Button, Container, SEO } from '../components';
import { SUPPORT_URL } from '../lib/support-link';

const accessPromises = [
    {
        title: 'No account tiers',
        description: 'Every signed-in account gets the same product features. There is no paid upgrade path.',
    },
    {
        title: 'No feature paywalls',
        description: 'Search, favorites, playlists and creator tools all come with the account.',
    },
    {
        title: 'Limits for safety only',
        description: 'Operational limits exist only for security, spam prevention, and service reliability.',
    },
];

export default function SupportPage() {
    return (
        <>
            <SEO
                title='Support clpr'
                description='clpr is free to use. If you want to chip in, Subcult has a Patreon. It is optional and changes nothing about your account.'
                canonicalUrl='/support'
            />
            <Container className='py-8'>
                <div className='mx-auto max-w-4xl'>
                    <p className='kicker mb-3'>Community supported</p>
                    <h1 className='display text-4xl sm:text-6xl'>
                        clpr is free.<br />Patreon is the tip jar.
                    </h1>
                    <p className='mt-6 max-w-2xl text-lg text-text-secondary'>
                        Accounts are free and nothing sits behind a subscription. If clpr is useful to you, Patreon is an optional way to support SUBCULT, the studio behind clpr and its other projects. Contributions do not go to featured streamers.
                    </p>
                    <div className='mt-8 flex flex-wrap items-center gap-x-4 gap-y-2'>
                        <Button asChild size='lg'>
                            <a href={SUPPORT_URL}>
                                Support Subcult on Patreon
                            </a>
                        </Button>
                        <span className='text-sm text-text-secondary'>Optional. No features attached.</span>
                    </div>

                    <dl className='mt-12 border-b border-line-strong'>
                        {accessPromises.map(item => (
                            <div key={item.title} className='grid gap-1 border-t border-line-strong py-5 sm:grid-cols-[16rem_1fr] sm:gap-8'>
                                <dt className='font-heading text-xl font-bold uppercase tracking-[0.01em] text-foreground'>{item.title}</dt>
                                <dd className='text-text-secondary'>{item.description}</dd>
                            </div>
                        ))}
                    </dl>

                    <p className='mt-8 max-w-2xl text-sm text-text-secondary'>
                        Patreon support is handled by Patreon under its own terms. Supporting does not change your clpr account, permissions, limits, or ranking.
                    </p>
                </div>
            </Container>
        </>
    );
}
