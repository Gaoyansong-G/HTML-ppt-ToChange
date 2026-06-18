import { useEditorStore } from '../stores/editor.store';
import { exampleCourseware } from '../examples/example-courseware';
import { Player } from './Player';

export function PlayerPage() {
  const { courseware } = useEditorStore();
  return <Player courseware={courseware || exampleCourseware} />;
}
