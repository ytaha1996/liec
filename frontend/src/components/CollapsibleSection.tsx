import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import React, { useState } from 'react';
import { makeStyles } from 'tss-react/mui';
import { Collapse, IconButton } from '@mui/material';
import GenericButton from './GenericButton';

interface ICollapsibleSectionProps {
  title: string | any;
  open?: boolean;
  className?: string;
  classes?: { header?: string; content?: string };
  children?: React.ReactNode;
  actions?: JSX.Element;
  onButtonClick?: () => void;
}

const useStyles = makeStyles()((theme) => ({
  container: {
    width: '100%',
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body1.fontSize as any,
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[1],
    marginBottom: theme.spacing(2),
  },
  header: {
    cursor: 'pointer',
    fontSize: theme.typography.h6.fontSize as any,
    lineHeight: '27px',
    color: theme.palette.text.secondary,
    '&:hover': {
      color: theme.palette.text.primary,
    },
    background: 'transparent',
    border: 'none',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
  },
  content: {
    padding: theme.spacing(2),
  },
  collapse: {
    transform: 'rotate(0deg)',
    transition: theme.transitions.create('transform', {
      duration: theme.transitions.duration.shortest,
    }),
  },
  collapseOpen: {
    transform: 'rotate(180deg)',
  },
  actions: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
    },
  },
}));


const CollapsibleSection: React.FC<ICollapsibleSectionProps> = ({
  title,
  open,
  className,
  classes = {},
  children,
  actions,
  onButtonClick,
}) => {
  const { classes: collapsableClasses, cx } = useStyles();
  const [collapse, setCollapse] = useState(!!open);

  function toggleCollapse() {
    setCollapse(!collapse);
  }

  return (
    <div className={collapsableClasses.container}>
      <div
        role="presentation"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <IconButton
            aria-label={'Show More'}
            className={cx(collapsableClasses.collapse, {
              [collapsableClasses.collapseOpen]: collapse,
            })}
            onClick={toggleCollapse}
          >
            <ExpandMoreIcon />
          </IconButton>
          {title}
        </div>
        {actions && (
          <GenericButton
            type="button"
            onClick={onButtonClick}
            text='Cancel'
          />
        )}
      </div>
      <Collapse
        in={collapse}
        timeout={150}
        className={cx(collapsableClasses.content, classes.content)}
        classes={
          className
            ? {
              wrapperInner: className,
            }
            : {}
        }
      >
        {children}
      </Collapse>
    </div>
  );
};

export default CollapsibleSection;
