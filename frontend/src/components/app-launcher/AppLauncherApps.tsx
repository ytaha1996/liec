import React, { useState, useEffect } from 'react';
import CollapsibleSection from '../CollapsibleSection';
import IconDescriptionTile from '../IconDescriptionTile';
import { makeStyles } from 'tss-react/mui';
import { Typography } from '@mui/material';
import { IApplication } from '../../IApplication';

interface IAppLauncherAppsProps {
  applications: Record<string, IApplication>;
  searchKey: string;
  closeModal: () => void;
}

const useStyles = makeStyles()((theme) => ({
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: theme.spacing(4),
  },
  headerTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: theme.palette.primary.main,
    marginTop: '2rem',
  },
  headerSubtitle: {
    fontSize: '1rem',
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(1),
  },
  tilesContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
    justifyContent: 'flex-start',
  },
  tileWrapper: {
    flexBasis: 'calc(33.33% - 20px)',
    flexGrow: 0,
    flexShrink: 0,
  },
  emptyState: {
    textAlign: 'center',
    marginTop: theme.spacing(4),
    fontSize: '1rem',
    color: theme.palette.text.secondary,
  },
}));

const AppLauncherApps: React.FC<IAppLauncherAppsProps> = ({
  applications,
  closeModal,
  searchKey,
}) => {
  const { classes } = useStyles();
  const [filteredApplications, setFilteredApplications] = useState(applications);

  useEffect(() => {
    if (searchKey && searchKey.trim()) {
      const newApps: Record<string, IApplication> = {};
      Object.keys(applications).forEach((appKey) => {
        if (
          applications[appKey].title
            .toLowerCase()
            .includes(searchKey.toLowerCase())
        ) {
          newApps[appKey] = applications[appKey];
        }
      });
      setFilteredApplications(newApps);
    } else {
      setFilteredApplications(applications);
    }
  }, [applications, searchKey]);

  const getAppPath = (app: IApplication) => Object.values(app.modules)[0]?.route ?? app.route;

  return (
    <>
      <div className={classes.header}>
        <Typography className={classes.headerTitle}>All Applications</Typography>
        <Typography className={classes.headerSubtitle}>
          Browse through your available apps below
        </Typography>
      </div>

      <CollapsibleSection title="Applications" className={classes.tilesContainer} open>
        {Object.keys(filteredApplications).length > 0 ? (
          Object.keys(filteredApplications).map((appKey) => (
            <div key={appKey} className={classes.tileWrapper}>
              <IconDescriptionTile
                title={filteredApplications[appKey].title}
                imgSrc={filteredApplications[appKey].icon || ''}
                description={filteredApplications[appKey].description || ''}
                route={getAppPath(filteredApplications[appKey])}
                onClick={closeModal}
              />
            </div>
          ))
        ) : (
          <Typography className={classes.emptyState}>
            No applications found. Try refining your search.
          </Typography>
        )}
      </CollapsibleSection>
    </>
  );
};

export default AppLauncherApps;
