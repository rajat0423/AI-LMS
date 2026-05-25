import { useContext } from 'react';
import UserContext from './user-context';

export function useGlobalUser() {
    return useContext(UserContext);
}
