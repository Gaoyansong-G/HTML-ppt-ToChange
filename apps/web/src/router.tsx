import { createBrowserRouter, Link, RouterProvider } from 'react-router-dom';
import App from './App';
import { PlayerPage } from './player/PlayerPage';
import { Editor } from './editor/Editor';
import { AIWizard } from './ai-wizard/AIWizard';
import { CoursewareList } from './courseware-list/CoursewareList';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/player',
    element: <PlayerPage />,
  },
  {
    path: '/editor',
    element: <Editor />,
  },
  {
    path: '/wizard',
    element: <AIWizard />,
  },
  {
    path: '/courseware-list',
    element: <CoursewareList />,
  },
  {
    path: '*',
    element: (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">404</h1>
        <p>页面不存在</p>
        <Link to="/" className="text-blue-600 hover:underline">返回首页</Link>
      </div>
    ),
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}

export default router;
