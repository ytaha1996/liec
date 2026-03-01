import React from 'react';
import { NavLink } from 'react-router-dom';
import CollapsibleSection from '../CollapsibleSection';
import { makeStyles } from 'tss-react/mui';
import { IApplication } from '../../IApplication';

interface IAppLauncherModulesProps {
  applications: Record<string, IApplication>;
  searchKey: string;
  closeModal: () => void;
}

const useStyles = makeStyles()((theme) => ({
  collapseContent: {
    width: '100%',
    display: 'grid',
    gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
    gap: '10px',
  },
  moduleLink: {
    color: theme.palette.primary.main,
    textDecoration: 'none',
    fontSize: '16px',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  activeLink: {
    fontWeight: 'bold',
    fontSize: '16px',
    fontFamily: 'sans-serif',
  },
  submoduleLink: {
    marginLeft: '1rem',
  },
}));

const AppLauncherModules: React.FC<IAppLauncherModulesProps> = ({
  applications,
  closeModal,
  searchKey,
}) => {
  const { classes, cx } = useStyles();

  return (
    <CollapsibleSection
      title={'All Modules'}
      className={classes.collapseContent}
      open
    >
      {Object.values(applications).map((app) =>
        Object.keys(app.modules).map(
          (moduleName) =>
            (!searchKey ||
              !searchKey.trim() ||
              app.modules[moduleName].title
                .toLowerCase()
                .includes(searchKey.toLowerCase())) && (
              <NavLink
                key={moduleName}
                to={app.modules[moduleName].route}
                className={({ isActive }) =>
                  cx(classes.moduleLink, { [classes.activeLink]: isActive })
                }
                onClick={closeModal}
              >
                {app.modules[moduleName].title}
              </NavLink>
            )
        )
      )}
    </CollapsibleSection>
  );
};

export default AppLauncherModules;
