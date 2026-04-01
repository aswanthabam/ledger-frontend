import { Redirect } from 'expo-router';
import { useAppStore } from '../stores/useAppStore';

export default function Index() {
    // const isAuthenticating = useAppStore((state) => state.isAuthenticating);

    // If we're in the middle of auth (e.g. redirected back from Google), 
    // don't trigger another redirect to splash yet. Let sign-in.tsx handle it.
    // if (isAuthenticating) {
    //     return null;
    // }

    return <Redirect href="/splash" />;
}
