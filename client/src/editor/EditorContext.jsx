import { createContext, useContext } from 'react';

// { role, roles, aiEnabled }
export const EditorContext = createContext({ role: null, roles: [], aiEnabled: false });
export const useEditor = () => useContext(EditorContext);
