# AgentWorks Studio - Development Notes

## Architecture Overview

AgentWorks Studio is a single-page application (SPA) that demonstrates a kanban-native, agent-powered software factory. The entire application runs on mock data with no external API dependencies, making it perfect for demonstrations and as the contract for future backend development.

## Core Architecture

### 1. Data Flow

**SpecStore (src/SpecStore.js)**
- Centralized state management
- localStorage persistence
- Reactive subscriptions
- Change history tracking

**Mock Data (src/mockData.js)**
- Single source of truth for all mock entities
- Consistent relationships between entities
- Exported as ES6 modules

**App Integration (js/app-integrated.js)**
- Main application controller
- View routing and initialization
- UI interactions and events

### 2. Key Components

#### Data Entities
- **Workspace**: Top-level container for projects
- **Project**: Active project with status and metadata
- **Cards**: Kanban cards with lane assignments
- **Agents**: AI agents with contracts and providers
- **Workflows**: Automated step-by-step processes
- **Usage Events**: Tracking of agent usage and costs
- **Schemas**: Database and UI structure definitions

#### Views
- **Planning**: Project documentation (Blueprint, PRD, MVP)
- **Kanban**: Interactive board with drag-drop
- **DB Builder**: Visual database schema editor
- **UI Builder**: Screen and component designer
- **Workflows**: Process flow visualization
- **Agents**: Agent contract board
- **Usage**: Usage metrics and billing

## File Structure

```
apps/agentworks/
├── index.html              # Main SPA entry point
├── src/
│   ├── SpecStore.js       # Central state management
│   └── mockData.js        # All mock data definitions
├── js/
│   └── app-integrated.js  # Main application controller
├── views/
│   ├── planning.html      # Planning view with documentation
│   ├── kanban.html        # Kanban board (to be updated)
│   ├── db-builder.html    # Database schema editor
│   ├── ui-builder.html    # UI screen designer
│   ├── workflows.html    # Workflow visualizer
│   ├── agents.html       # Agent contract board
│   └── usage.html        # Usage metrics
├── css/
│   └── styles.css        # Global styles
└── data/
    └── mock-data.js      # Legacy mock data (kept for compatibility)
```

## How to Extend

### Adding New Mock Data

1. **Update mockData.js**:
   ```javascript
   export const mockNewEntity = {
     items: [
       { id: 'item-1', name: 'Example', value: 100 }
     ]
   };
   ```

2. **Include in mockData export**:
   ```javascript
   export const mockData = {
     // ... existing data
     newEntity: mockNewEntity
   };
   ```

3. **Access in views**:
   ```javascript
   const data = window.specStore.get('newEntity');
   ```

### Creating New Views

1. **Add HTML template** in `views/`
2. **Add route in index.html navigation**
3. **Add view initialization in app-integrated.js**:
   ```javascript
   case 'my-new-view':
     this.initMyNewView();
     break;
   ```

### Adding New Agents

1. **Add to mockData.js agents array**:
   ```javascript
   {
     id: 'agent-new',
     name: 'New Specialist Agent',
     role: 'Specialization',
     // ... other properties
   }
   ```

2. **Agent appears automatically in Agents view**

### Adding New Workflows

1. **Add to mockData.js workflows array**:
   ```javascript
   {
     id: 'wf-new',
     name: 'New Process',
     trigger: 'manual',
     steps: [
       { action: 'do_something', agent: 'agent-id' }
     ]
   }
   ```

## API Integration Points

When connecting to real APIs, replace these functions in SpecStore:

### Data Loading
- Replace mock data with API calls
- Keep same data structure for compatibility
- Use `this.set()` to update store

### Agent Execution
- Replace `triggerWorkflow()` simulation
- Add real agent API integration
- Track actual usage and costs

### Persistence
- Keep localStorage for offline capability
- Add API sync functionality
- Implement conflict resolution

## Debugging

### Console Access
- `window.specStore` - Direct access to state
- `window.agentWorksStudio` - App instance
- Use browser dev tools for debugging

### Common Issues
- **Module loading**: Ensure ES6 modules load before app initialization
- **Data sync**: Check console for subscription errors
- **Drag & Drop**: Verify event listeners on cards

## Performance Considerations

- Mock data is loaded once and cached in memory
- Subscribe only to needed data paths
- Debounce rapid state changes
- Use `requestAnimationFrame` for UI updates

## Browser Compatibility

- Modern browsers with ES6 module support
- Tested in Chrome, Firefox, Safari, Edge
- Uses localStorage for persistence
- No external dependencies

## Security Notes

- No external API calls
- All data is mock/demo data
- localStorage is used for persistence
- No authentication implemented (mock user)

## Future Enhancements

1. **Real Agent Integration**
   - Connect to actual LLM APIs
   - Implement agent queue management
   - Add real-time execution tracking

2. **Multi-Project Support**
   - Project switching in UI
   - Separate data per project
   - Project templates

3. **Advanced Collaboration**
   - Multiple users
   - Real-time updates
   - Comments and annotations

4. **Import/Export**
   - Save/load project configurations
   - Export to various formats
   - Import from external tools

## Testing

### Manual Testing Checklist
- [ ] Navigation works between all views
- [ ] Planning view loads project data
- [ ] Kanban cards can be dragged between lanes
- [ ] Agent contracts display correctly
- [ ] Usage charts render data
- [ ] Terminal shows agent activity
- [ ] Right panel updates with context
- [ ] Data persists across reloads

### Mock Data Validation
- All entities have consistent IDs
- Relationships are properly defined
- No circular references
- Example data is realistic

## Deployment

### Static Hosting
The entire application can be served from any static file server:
```bash
python3 -m http.server 3010
```

### Integration with EngageSuite
- Run alongside other EngageSuite services
- Port 3010 by default
- No conflicts with other apps

## Contributing

When adding features:
1. Follow existing code patterns
2. Update mock data appropriately
3. Add corresponding UI components
4. Update documentation
5. Test manually before committing

## Quick Start

1. Open `index.html` in a browser
2. Navigate through all views
3. Try moving cards in Kanban
4. Click on agents to view contracts
5. Check terminal for activity logs
6. Verify data persistence

## Support

For issues or questions:
- Check browser console for errors
- Verify all files are present
- Ensure CORS headers for local development
- Check network tab for failed loads