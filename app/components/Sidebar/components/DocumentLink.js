// @flow
import { observable } from "mobx";
import { observer, Observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import DocumentsStore from "stores/DocumentsStore";
import Collection from "models/Collection";
import Document from "models/Document";
import DropToImport from "components/DropToImport";
import Fade from "components/Fade";
import Flex from "components/Flex";
import { SidebarDnDContext } from "./Collections";
import Draggable from "./Draggable";
import Droppable from "./Droppable";
import EditableTitle from "./EditableTitle";
import SidebarLink from "./SidebarLink";
import DocumentMenu from "menus/DocumentMenu";
import { type NavigationNode } from "types";

type Props = {|
  node: NavigationNode,
  documents: DocumentsStore,
  collection: Collection,
  canUpdate: boolean,
  collection: Collection,
  activeDocument: ?Document,
  activeDocumentRef?: (?HTMLElement) => void,
  prefetchDocument: (documentId: string) => Promise<void>,
  depth: number,
  isDropDisabled?: boolean,
|};

@observer
class DocumentLink extends React.Component<Props> {
  @observable menuOpen = false;

  componentDidMount() {
    if (this.isActiveDocument() && this.hasChildDocuments()) {
      this.props.documents.fetchChildDocuments(this.props.node.id);
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.activeDocument !== this.props.activeDocument) {
      if (this.isActiveDocument() && this.hasChildDocuments()) {
        this.props.documents.fetchChildDocuments(this.props.node.id);
      }
    }
  }

  handleMouseEnter = (ev: SyntheticEvent<>) => {
    const { node, prefetchDocument } = this.props;

    ev.stopPropagation();
    ev.preventDefault();
    prefetchDocument(node.id);
  };

  handleTitleChange = async (title: string) => {
    const document = this.props.documents.get(this.props.node.id);
    if (!document) return;

    await this.props.documents.update({
      id: document.id,
      lastRevision: document.revision,
      text: document.text,
      title,
    });
  };

  isActiveDocument = () => {
    return (
      this.props.activeDocument &&
      this.props.activeDocument.id === this.props.node.id
    );
  };

  hasChildDocuments = () => {
    return !!this.props.node.children.length;
  };

  render() {
    const {
      node,
      documents,
      collection,
      activeDocument,
      activeDocumentRef,
      prefetchDocument,
      depth,
      isDropDisabled,
      canUpdate,
    } = this.props;

    const showChildren = !!(
      activeDocument &&
      collection &&
      (collection
        .pathToDocument(activeDocument)
        .map((entry) => entry.id)
        .includes(node.id) ||
        this.isActiveDocument())
    );
    const document = documents.get(node.id);
    const title = node.title || "Untitled";

    let hideDisclosure;
    if (!this.hasChildDocuments()) {
      hideDisclosure = true;
    }

    return (
      <Flex
        column
        key={node.id}
        ref={this.isActiveDocument() ? activeDocumentRef : undefined}
        onMouseEnter={this.handleMouseEnter}
      >
        <DropToImport documentId={node.id} activeClassName="activeDropZone">
          <SidebarDnDContext.Consumer>
            {({ draggingDocumentId, isDragging }) => {
              const disableChildDrops =
                isDropDisabled || draggingDocumentId === node.id;

              return (
                <SidebarLink
                  to={{
                    pathname: node.url,
                    state: { title: node.title },
                  }}
                  expanded={showChildren ? true : undefined}
                  hideDisclosure={hideDisclosure}
                  label={
                    <EditableTitle
                      title={title}
                      onSubmit={this.handleTitleChange}
                      canUpdate={canUpdate}
                    />
                  }
                  depth={depth}
                  exact={false}
                  menuOpen={this.menuOpen}
                  menu={
                    document ? (
                      <Fade>
                        <DocumentMenu
                          position="right"
                          document={document}
                          onOpen={() => (this.menuOpen = true)}
                          onClose={() => (this.menuOpen = false)}
                        />
                      </Fade>
                    ) : undefined
                  }
                >
                  {this.hasChildDocuments() && !disableChildDrops && (
                    <Droppable
                      collectionId={collection.id}
                      documentId={node.id}
                      isDropDisabled={disableChildDrops}
                    >
                      {(provided, snapshot) => (
                        <DocumentChildren column>
                          <Observer>
                            {() =>
                              node.children.map((childNode, index) => (
                                <Draggable
                                  key={childNode.id}
                                  draggableId={childNode.id}
                                  index={index}
                                >
                                  <DocumentLink
                                    key={childNode.id}
                                    collection={collection}
                                    node={childNode}
                                    documents={documents}
                                    activeDocument={activeDocument}
                                    prefetchDocument={prefetchDocument}
                                    canUpdate={canUpdate}
                                    depth={depth + 1}
                                    isDropDisabled={disableChildDrops}
                                  />
                                </Draggable>
                              ))
                            }
                          </Observer>
                        </DocumentChildren>
                      )}
                    </Droppable>
                  )}
                </SidebarLink>
              );
            }}
          </SidebarDnDContext.Consumer>
        </DropToImport>
      </Flex>
    );
  }
}

const DocumentChildren = styled(Flex)``;

export default DocumentLink;
