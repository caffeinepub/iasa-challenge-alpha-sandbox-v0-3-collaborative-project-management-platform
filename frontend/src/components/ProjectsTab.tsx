import { Project } from '../backend';
import ProjectCard from './ProjectCard';

interface ProjectsTabProps {
  projects: Project[];
}

export default function ProjectsTab({ projects }: ProjectsTabProps) {
  if (projects.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-dashed">
        <div className="text-center">
          <p className="text-lg font-medium text-muted-foreground">No projects found</p>
          <p className="text-sm text-muted-foreground">Create a new project to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard key={project.id.toString()} project={project} />
      ))}
    </div>
  );
}
