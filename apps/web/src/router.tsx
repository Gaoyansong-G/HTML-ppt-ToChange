import {
  createBrowserRouter,
  Link,
  Navigate,
  RouterProvider,
  useParams,
} from 'react-router-dom';
import App from './App';
import { PlayerPage } from './player/PlayerPage';
import { Editor } from './editor/Editor';
import { AIWizard } from './ai-wizard/AIWizard';
import { CoursewareList } from './courseware-list/CoursewareList';

function LegacyCoursewareRedirect({ mode }: { mode: 'edit' | 'present' }) {
  return (
    <Navigate
      to={`/courseware/cw-example-server-001/${mode}`}
      replace
    />
  );
}

function CoursewareEditorRoute() {
  const { id } = useParams<{ id: string }>();
  return <Editor key={id} />;
}

function CoursewarePlayerRoute() {
  const { id } = useParams<{ id: string }>();
  return <PlayerPage key={id} />;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/player',
    element: <LegacyCoursewareRedirect mode="present" />,
  },
  {
    path: '/editor',
    element: <LegacyCoursewareRedirect mode="edit" />,
  },
  {
    path: '/courseware/:id/present',
    element: <CoursewarePlayerRoute />,
  },
  {
    path: '/courseware/:id/edit',
    element: <CoursewareEditorRoute />,
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
  return <RouterProvider router={router} future={{ v7_startTransition: true }} />;
}

export default router;
