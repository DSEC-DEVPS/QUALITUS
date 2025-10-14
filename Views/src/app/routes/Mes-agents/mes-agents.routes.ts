import { Routes } from '@angular/router';
import { ListeMesAgentsComponent } from './liste-mes-agents/liste-mes-agents.component';
import { SingleAgentComponent } from './single-agent/single-agent.component';

export const routes: Routes = [
  { path: 'Liste', component: ListeMesAgentsComponent },
  { path: 'details-agent/:id', component: SingleAgentComponent },
];
